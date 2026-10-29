// Temporary content for pages that haven't been built yet.
export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <header className="border-b border-line bg-white px-5 py-3">
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted">{description}</p>
      </header>
      <div className="p-4">
        <div className="rounded-[10px] border border-dashed border-line bg-white px-4 py-10 text-center text-xs text-muted">
          หน้านี้กำลังพัฒนา (coming in a later step)
        </div>
      </div>
    </>
  );
}
