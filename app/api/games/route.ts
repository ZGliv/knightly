// Cloud storage is intentionally unavailable until authenticated ownership policies exist.
export function GET() {
  return Response.json(
    {
      error:
        "Games are stored in this browser. Open Your games to find them.",
    },
    { status: 410 },
  );
}
export const POST = GET;
