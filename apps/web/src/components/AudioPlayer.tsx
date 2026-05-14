export function AudioPlayer({
  audioBase64,
  mimeType,
}: {
  audioBase64: string;
  mimeType: string;
}) {
  const src = `data:${mimeType};base64,${audioBase64}`;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- generated music clip, no captions */}
      <audio controls src={src} className="w-full" />
    </div>
  );
}
