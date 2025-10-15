import React, { useContext } from 'react'
import './ExploreMenu.css'
import { StoreContext } from '../../Context/StoreContext'

const ExploreMenu = ({category,setCategory}) => {

  const {menu_list, all_food_list, vendorMap} = useContext(StoreContext);
  
  return (
    <div className='explore-menu' id='explore-menu'>
      <h1>Explore our menu</h1>
      <p className='explore-menu-text'>Choose from a diverse menu featuring a delectable array of dishes. Our mission is to satisfy your cravings and elevate your dining experience, one delicious meal at a time.</p>
      <div className="explore-menu-list">
    {menu_list.map((menuItem,index)=>{
      // find a vendor that has at least one food item in this category
      let vendorName = '';
      try {
        const found = (all_food_list || []).find(f => f.category === menuItem.menu_name && f.vendorId && vendorMap && vendorMap[f.vendorId]);
        if (found) vendorName = vendorMap[found.vendorId];
      } catch(e){}

      return (
        <div onClick={()=>setCategory(prev=>prev===menuItem.menu_name?"All":menuItem.menu_name)} key={index} className='explore-menu-list-item'>
          <img src={menuItem.menu_image} className={category===menuItem.menu_name?"active":""} alt="" />
          <p>{menuItem.menu_name}</p>
          {vendorName ? <small className='menu-vendor'>From: {vendorName}</small> : null}
        </div>
      )
    })}
      </div>
      <hr />
    </div>
  )
}

export default ExploreMenu
