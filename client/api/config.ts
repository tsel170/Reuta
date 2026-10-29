const INVITE = /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i;

export function GET() {
  const url = process.env.WHATSAPP_INVITE_URL?.trim() ?? "";
  return Response.json({
    whatsappInviteUrl: INVITE.test(url) ? url : null,
  });
}
