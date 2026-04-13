export default function ZeroLayout({ children }) {
  return (
    <>
      <style>{`
        html, body { height: auto !important; overflow: auto !important; background: #f8fafc !important; }
      `}</style>
      {children}
    </>
  );
}
