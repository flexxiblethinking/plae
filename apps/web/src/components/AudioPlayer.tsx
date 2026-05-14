export function AudioPlayer({
  audioBase64,
  mimeType,
}: {
  audioBase64: string;
  mimeType: string;
}) {
  const src = `data:${mimeType};base64,${audioBase64}`;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-panel-2 p-4">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- generated music clip, no captions */}
      <audio controls src={src} className="w-full" />
    </div>
  );
}
