export default function TestColors() {
  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      <div className="bg-primary text-text p-4 rounded">Primary</div>
      <div className="bg-secondary text-text p-4 rounded">Secondary</div>
      <div className="bg-background text-text p-4 rounded">Background</div>
      <div className="bg-success text-white p-4 rounded">Success</div>
      <div className="bg-error text-white p-4 rounded">Error</div>
      <div className="bg-warning text-black p-4 rounded">Warning</div>
    </div>
  );
}
