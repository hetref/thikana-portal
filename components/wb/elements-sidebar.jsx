const ElementItem = ({ element }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('type', element.type);
    e.dataTransfer.setData('source', 'sidebar');
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className="flex items-center justify-between p-2 border rounded-md mb-2 cursor-move bg-white hover:bg-gray-50"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex items-center">
        {element.icon && <element.icon className="mr-2 h-4 w-4" />}
        <span>{element.label}</span>
      </div>
    </div>
  );
}; 