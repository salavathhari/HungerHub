import React, { useContext, useState } from 'react'
import './FoodItem.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../Context/StoreContext';
import { Link } from 'react-router-dom'

const FoodItem = ({ image, name, price, desc , id, averageRating = 0, ratingCount = 0, vendorId, vendorName }) => {

    const [itemCount, setItemCount] = useState(0);
    const {cartItems,addToCart,removeFromCart,url,currency,rateFood,vendorMap,getVendorName} = useContext(StoreContext);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [resolvedVendorName, setResolvedVendorName] = useState(vendorName || null);

    // if vendorName not provided, try to resolve via context helper
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            if (!resolvedVendorName && vendorId && typeof getVendorName === 'function') {
                try {
                    const n = await getVendorName(vendorId);
                    if (mounted && n) setResolvedVendorName(n);
                } catch (e) {}
            }
        })();
        return () => { mounted = false };
    }, [vendorId, resolvedVendorName, getVendorName]);

    return (
        <Link to={`/product/${encodeURIComponent(id)}`} className='food-item-link'>
        <div className='food-item'>
            <div className='food-item-img-container'>
                {(() => {
                    // determine image src: backend filenames should be requested from /images/<filename>
                    // static imports (local assets) are already full paths or module-resolved strings
                    let src = "";
                    try {
                        if (!image) {
                            src = assets.logo;
                        } else if (typeof image === 'string') {
                            const lower = image.toLowerCase();
                            if (lower.startsWith('http') || lower.startsWith('/') || lower.startsWith('data:') || lower.includes('/assets/')) {
                                src = image;
                            } else {
                                // treat as backend filename
                                src = url + "/images/" + image;
                            }
                        } else if (typeof image === 'object') {
                            // Vite sometimes returns module objects - try default
                            src = image.default || String(image);
                        } else {
                            src = assets.logo;
                        }
                    } catch (e) {
                        src = assets.logo;
                    }

                    return <img className='food-item-image' src={src} alt={name || 'food'} onError={(e) => { e.target.onerror = null; e.target.src = assets.logo }} />
                })()}
                {!cartItems[id]
                ?<img className='add' onClick={() => addToCart(id)} src={assets.add_icon_white} alt="" />
                :<div className="food-item-counter">
                        <img src={assets.remove_icon_red} onClick={()=>removeFromCart(id)} alt="" />
                        <p>{cartItems[id]}</p>
                        <img src={assets.add_icon_green} onClick={()=>addToCart(id)} alt="" />
                    </div>
                }
            </div>
            <div className="food-item-info">
                                <div className="food-item-name-rating">
                                        <div style={{display:'flex',flexDirection:'column'}}>
                                            <p>{name}</p>
                                            {resolvedVendorName ? <small className='vendor-name'>From: {resolvedVendorName}</small> : (vendorId && vendorMap && vendorMap[vendorId] ? <small className='vendor-name'>From: {vendorMap[vendorId]}</small> : null)}
                                        </div>
                                        <div className='rating-inline' title={averageRating ? `${Number(averageRating).toFixed(1)} (${ratingCount || 0} reviews)` : 'No rating yet'}>
                                                <img src={assets.rating_starts} alt="rating" />
                                                {averageRating > 0 ? (
                                                    <>
                                                        <span className='rating-value'>{Number(averageRating).toFixed(1)}</span>
                                                        <span className='rating-count'>{ratingCount ? `(${ratingCount})` : ''}</span>
                                                    </>
                                                ) : (
                                                    <span className='rating-value muted'>—</span>
                                                )}
                                        </div>
                                </div>
                            <p className="food-item-desc">{desc}</p>
                            {/** small vendor address snippet is shown via .vendor-name above; removed debug vendorId display for cleanliness */}
                <p className="food-item-price">{currency}{price}</p>
                <div className='food-item-rate'>
                    <div className='rate-stars'>
                        {[1,2,3,4,5].map((s)=> {
                            // cumulative behavior: highlight all stars up to hovered or selected value
                            const filled = hoverRating ? s <= hoverRating : s <= userRating;
                            return (
                                <button
                                    key={s}
                                    className={filled?"star picked":"star"}
                                    onMouseEnter={() => setHoverRating(s)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={async ()=>{ setUserRating(s); try{ await rateFood(id,s); }catch(e){} }}
                                    aria-label={`Rate ${s} star${s>1? 's':''}`}
                                >
                                    {filled ? '★' : '☆'}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
        </Link>
    )
}

export default FoodItem
