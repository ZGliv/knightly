export function GET() {
  return Response.json(
    { error: "Cloud game access is unavailable. Open your local library." },
    { status: 410 },
  );
}
