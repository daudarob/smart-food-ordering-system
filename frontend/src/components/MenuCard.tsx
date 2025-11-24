import React, { useEffect, useRef, useState } from 'react';
import './MenuCard.css';

interface MenuCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  onAddToCart: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ id, name, description, price, image_url, onAddToCart, isFavorite = false, onToggleFavorite }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const priceRef = useRef<HTMLParagraphElement>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  // Use API image URL if available, otherwise fallback to dynamic generation
  const getImageUrl = (itemName: string, apiImageUrl?: string): string => {
    if (apiImageUrl && apiImageUrl.startsWith('/')) {
      // API image URL is already a frontend public path, use as-is
      return apiImageUrl;
    }
    // Fallback: generate URL from item name with multiple format support
    const formattedName = itemName.toLowerCase().replace(/\s+/g, '-');
    const possibleExtensions = ['.jpg', '.jpeg', '.png'];

    // Check if any of the possible image files exist by trying to load them
    for (const ext of possibleExtensions) {
      const testUrl = `/${formattedName}${ext}`;
      const img = new Image();
      img.src = testUrl;
      if (img.complete && img.naturalHeight !== 0) {
        return testUrl;
      }
    }

    // Default fallback
    return `/${formattedName}.jpg`;
  };

  // Force reload images by adding timestamp to prevent caching issues
  const getCacheBustedUrl = (url: string): string => {
    return `${url}?t=${Date.now()}`;
  };

  const imageSrc = getCacheBustedUrl(getImageUrl(name, image_url));

  useEffect(() => {
    if (cardRef.current && titleRef.current && descRef.current && priceRef.current) {
      const cardStyles = getComputedStyle(cardRef.current);
      const titleStyles = getComputedStyle(titleRef.current);
      const descStyles = getComputedStyle(descRef.current);
      const priceStyles = getComputedStyle(priceRef.current);

      console.log('MenuCard Diagnostics for item:', name);
      console.log('Card background:', cardStyles.backgroundColor);
      console.log('Title color:', titleStyles.color, 'background:', titleStyles.backgroundColor, 'text-shadow:', titleStyles.textShadow);
      console.log('Description color:', descStyles.color, 'background:', descStyles.backgroundColor, 'text-shadow:', descStyles.textShadow);
      console.log('Price color:', priceStyles.color, 'background:', priceStyles.backgroundColor, 'text-shadow:', priceStyles.textShadow);
      console.log('Current theme:', document.documentElement.getAttribute('data-theme') || 'light');
    }
  }, []);

  const handleImageError = () => {
    if (!imageError) {
      console.error(`Image failed to load for ${name}: ${imageSrc}`);
      console.error(`Full image URL: ${window.location.origin}${imageSrc}`);
      console.error(`API image URL from props: ${image_url}`);
      setImageError(true);
    }
  };

  console.log('MenuCard: Rendering item:', { id, name, description, price, apiImage: image_url, finalImage: imageSrc, imageError });

  // Test image loading on component mount
  useEffect(() => {
    const testImage = new Image();
    testImage.onload = () => {
      console.log(`✅ Image loaded successfully: ${imageSrc}`);
      setImageError(false); // Reset error state if image loads successfully
    };
    testImage.onerror = () => {
      console.error(`❌ Image failed to load: ${imageSrc}`);
      console.error(`Full URL attempted: ${window.location.origin}${imageSrc}`);
      console.error(`Original API URL: ${image_url}`);
      console.error(`Generated fallback URL: ${getImageUrl(name, undefined)}`);
      // Don't set error here - let onError handler manage it
    };
    testImage.src = imageSrc;
  }, [imageSrc, image_url, name]);

  return (
    <div ref={cardRef} className="menu-card" data-testid="menu-item">
      <div className="menu-image-container">
        <img
          src={imageSrc}
          alt={name}
          className="menu-image"
          onError={handleImageError}
        />
        {imageError && (
          <div className="image-fallback">
            <span>{name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="menu-content">
        <div className="menu-header">
          <h3 ref={titleRef}>{name}</h3>
          {onToggleFavorite && (
            <button
              className={`favorite-button ${isFavorite ? 'active' : ''}`}
              onClick={() => onToggleFavorite(id)}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          )}
        </div>
        <p ref={descRef} className="description">{description}</p>
        <p ref={priceRef} className="price">KES {price.toFixed(2)}</p>
        <button className="action-button" onClick={() => onAddToCart(id)}>Add to Cart</button>
      </div>
    </div>
  );
};

export default MenuCard;