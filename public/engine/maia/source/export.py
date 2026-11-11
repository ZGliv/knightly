from types import SimpleNamespace
from pathlib import Path
import torch, numpy as np, onnxruntime as ort
from models import MAIA3Model
cfg=SimpleNamespace(history=8,use_padding=True,include_time_info=False,dim_emb=128,num_blocks=8,mlp_ratio=2.,dropout=0.,use_gab=True,use_relative_bias=False,use_absolute_pe=False,use_rms_norm=True,omit_qkv_biases=True,activation='gelu',dim_vit=256,head_hid_dim=256,num_heads=8,gab_gen_size=64,gab_per_square_dim=0,gab_intermediate_dim=64)
model=MAIA3Model(cfg).eval()
ckpt=torch.load(str(Path(__file__).with_name('maia3-5m.pt')),map_location='cpu',weights_only=True)
sd=ckpt.get('model_state_dict',ckpt)
model.load_state_dict({k.replace('smolgen','gab'):v for k,v in sd.items()},strict=True)
class ExportRMS(torch.nn.Module):
 def __init__(self,old):
  super().__init__();self.weight=old.weight;self.eps=old.eps or torch.finfo(torch.float32).eps
 def forward(self,x):return x*torch.rsqrt(x.pow(2).mean(-1,keepdim=True)+self.eps)*self.weight
for parent in model.modules():
 for name,child in list(parent.named_children()):
  if isinstance(child,torch.nn.RMSNorm):setattr(parent,name,ExportRMS(child))
class Policy(torch.nn.Module):
 def __init__(self):super().__init__();self.model=model
 def forward(self,tokens,self_elo,opponent_elo):return self.model(tokens,self_elo,opponent_elo)[0]
policy=Policy().eval();torch.backends.mha.set_fastpath_enabled(False)
x=torch.rand(1,64,96);elo=torch.tensor([800],dtype=torch.float32)
path=str(Path(__file__).parent.parent / 'maia3-5m-v1.onnx')
torch.onnx.export(policy,(x,elo,elo),path,input_names=['tokens','self_elo','opponent_elo'],output_names=['policy'],opset_version=17,dynamo=False)
sess=ort.InferenceSession(path,providers=['CPUExecutionProvider']);y=sess.run(None,{'tokens':x.numpy(),'self_elo':elo.numpy(),'opponent_elo':elo.numpy()})[0]
with torch.no_grad():expected=policy(x,elo,elo).numpy()
print('Size',Path(path).stat().st_size,'max_error',np.abs(y-expected).max());np.testing.assert_allclose(y,expected,rtol=1e-3,atol=1e-4)
