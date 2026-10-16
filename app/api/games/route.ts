// Cloud storage is intentionally unavailable until authenticated ownership policies exist.
export function GET() {
  return Response.json(
    {
      error:
        "Games are stored in your browser. Use Games → Export backup to move them.",
    },
    { status: 410 },
  );
}
export const POST = GET;
