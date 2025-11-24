import React from 'react';
import Skeleton from './Skeleton';
import './MenuCardSkeleton.css';

const MenuCardSkeleton: React.FC = () => {
  return (
    <div className="menu-card-skeleton">
      <div className="menu-image-skeleton">
        <Skeleton height="180px" borderRadius="0" />
      </div>
      <div className="menu-content-skeleton">
        <Skeleton width="80%" height="20px" className="menu-name-skeleton" />
        <Skeleton width="40%" height="18px" className="menu-price-skeleton" />
        <Skeleton width="100%" height="32px" borderRadius="8px" className="menu-btn-skeleton" />
      </div>
    </div>
  );
};

export default MenuCardSkeleton;