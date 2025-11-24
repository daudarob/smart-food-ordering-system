import React from 'react';
import Skeleton from './Skeleton';
import './CafeteriaCardSkeleton.css';

const CafeteriaCardSkeleton: React.FC = () => {
  return (
    <div className="cafeteria-card-skeleton">
      <Skeleton width="60px" height="60px" borderRadius="50%" className="cafeteria-icon-skeleton" />
      <Skeleton width="80%" height="24px" className="cafeteria-name-skeleton" />
      <Skeleton width="70%" height="18px" className="cafeteria-location-skeleton" />
      <Skeleton width="60%" height="18px" className="cafeteria-hours-skeleton" />
    </div>
  );
};

export default CafeteriaCardSkeleton;