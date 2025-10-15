import React, { useContext } from 'react'
import './FoodDisplay.css'
import FoodItem from '../FoodItem/FoodItem'
import { StoreContext } from '../../Context/StoreContext'

const FoodDisplay = ({category, searchQuery = '', locationQuery = ''}) => {

  const {all_food_list, food_list, vendorDetails} = useContext(StoreContext);
  console.log('FoodDisplay: all_food_list count=', (all_food_list || []).length, ' food_list=', (food_list || []).length);

  return (
    <div className='food-display' id='food-display'>
      <h2>Top dishes near you</h2>
      {/* location debug UI removed - keep console diagnostics only */}
      <div className='food-display-list'>
        {all_food_list && all_food_list.length > 0 ? all_food_list.filter((item)=>{
            // filter by category
            const matchesCategory = (category === 'All') || (item && item.category === category);
            const q = (searchQuery || '').trim().toLowerCase();
            const lq = (locationQuery || '').trim().toLowerCase();

      // text matching (name or vendor)
      const nameMatch = item && item.name && item.name.toLowerCase().includes(q);
      const vendorMatch = item && (item.vendorName || item.vendor) && String(item.vendorName || item.vendor).toLowerCase().includes(q);
      const textMatch = q ? (nameMatch || vendorMatch) : false;

      // location matching (STRICT): when a locationQuery is provided we only match vendors whose
      // structured address (if present) or vendor name contains the location string.
      // We DO NOT use item name/description to satisfy location-only queries.
      const locMatchStrict = (() => {
        if (!lq) return false;
        if (!item) return false;
        const vd = vendorDetails && vendorDetails[String(item.vendorId)];
        if (!vd) return false; // no vendor details -> cannot match location strictly
        // 1) check structured address if present
        if (vd.address && Object.keys(vd.address).length > 0) {
          const addr = JSON.stringify(vd.address).toLowerCase();
          if (addr.includes(lq)) return true;
        }
        // 2) check vendor name
        const vendorName = (vd.name || '').toLowerCase();
        if (vendorName.includes(lq)) return true;
        return false;
      })();

      // debug: when user provided location, log diagnostics per item to see why it matched/failed
      if (lq) {
        try {
          const vd = vendorDetails && vendorDetails[String(item.vendorId)];
          const vdAddr = vd && vd.address ? JSON.stringify(vd.address) : '{}';
          const reason = locMatchStrict ? (
            (vd && vd.address && JSON.stringify(vd.address).toLowerCase().includes(lq)) ? 'addrMatch' :
            (((vd && vd.name) || item.vendorName || '').toLowerCase().includes(lq)) ? 'vendorNameMatch' :
            (item.name && item.name.toLowerCase().includes(lq)) ? 'itemNameMatch' :
            (item.description && item.description.toLowerCase().includes(lq)) ? 'itemDescMatch' : 'unknown'
          ) : 'noLocMatch';

          console.debug('loc-check', { id: item._id || item.name, name: item.name, vendorId: item.vendorId, vendorName: item.vendorName, vdAddr, locMatchStrict, reason });
        } catch (e) { console.debug('loc-check error', e) }
      }

            // Decide result based on which filters are supplied (strict location behavior):
            // - If both searchQuery and locationQuery present: require both textMatch and locMatchStrict
            // - If only locationQuery present: require locMatchStrict
            // - If only searchQuery present: require textMatch
            // - If neither present: include (matchesCategory)
            if (q && lq) return matchesCategory && textMatch && locMatchStrict;
            if (lq) return matchesCategory && locMatchStrict;
            if (q) return matchesCategory && textMatch;
            return matchesCategory;
        }).map((item)=>{
            return <FoodItem key={item._id || item.name} image={item.image} name={item.name} desc={item.description} price={item.price} id={item._id || item.name} averageRating={item.averageRating} ratingCount={item.ratingCount} vendorId={item.vendorId} vendorName={item.vendorName} />
        }) : (
          <div className="empty-state">No dishes found.</div>
        )}
      </div>
    </div>
  )
}

export default FoodDisplay
