const Clients = () => (
    <div className="px-6 py-12">
      <div className="flex justify-between items-center">
        {/* Skeleton for client logos */}
        {[...Array(6)].map((_, index) => (
          <div 
            key={index} 
            className="h-8 w-24 bg-gray-200 rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
  