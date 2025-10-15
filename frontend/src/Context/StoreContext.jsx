import { createContext, useEffect, useState } from "react";
import { io } from 'socket.io-client'
import { menu_list, food_list as static_food_list } from "../assets/assets";
import axios from "axios";
import { toast } from 'react-toastify';
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {

    // backend URL: prefer Vite env var, otherwise autodetect common local dev ports
    const [url, setUrl] = useState(import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000');
    const [food_list, setFoodList] = useState([]);
    // combined list: backend items + static assets not present in backend
    const [all_food_list, setAllFoodList] = useState([]);
    const [vendorMap, setVendorMap] = useState({});
    const [vendorDetails, setVendorDetails] = useState({});
    const [cartItems, setCartItems] = useState({});
    const [token, setToken] = useState("")
    const [role, setRole] = useState('user')
    const [myVendor, setMyVendor] = useState(null)
    // viewMode: 'auto' | 'vendor' | 'customer' - allows vendor users to switch to customer UI
    const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'auto')
    const [initializing, setInitializing] = useState(true)
    const [authFlash, setAuthFlash] = useState(null)
    const [lastOrderUpdate, setLastOrderUpdate] = useState(null)

    // helper to show a transient auth-related flash/snackbar
    const flashAuth = (type, message, duration = 2500) => {
        try {
            setAuthFlash({ type, message });
            setTimeout(() => setAuthFlash(null), duration);
        } catch (e) {
            console.warn('flashAuth failed', e);
        }
    }

    // auth animation state: { type: 'pulse'|'logout', active: bool }
    const [authAnim, setAuthAnim] = useState(null)
    const [socket, setSocket] = useState(null)

    const triggerAuthAnim = (type, duration = 900) => {
        try {
            setAuthAnim({ type, active: true })
            setTimeout(() => setAuthAnim(null), duration)
        } catch (e) { console.warn('triggerAuthAnim failed', e) }
    }
    const currency = "₹";
    const deliveryCharge = 50;

    const addToCart = async (itemId) => {
        if (!cartItems[itemId]) {
            setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
        }
        else {
            setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
        }
        if (token) {
                await axios.post(url + "/api/cart/add", { itemId }, { headers: { Authorization: `Bearer ${token}` } });
            }
    }

    const removeFromCart = async (itemId) => {
        setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }))
        if (token) {
            await axios.post(url + "/api/cart/remove", { itemId }, { headers: { Authorization: `Bearer ${token}` } });
        }
    }

    const getTotalCartAmount = () => {
        let totalAmount = 0;
        for (const item in cartItems) {
            try {
              if (cartItems[item] > 0) {
                let itemInfo = food_list.find((product) => product._id === item);
                totalAmount += itemInfo.price * cartItems[item];
            }  
            } catch (error) {
                
            }
            
        }
        return totalAmount;
    }

    const fetchFoodList = async () => {
        try {
            const response = await axios.get(url + "/api/food/list");
            const dbFoods = response.data.data || [];
            setFoodList(dbFoods);

            // merge static foods that are not present in DB (match by name or image)
            const merged = [...dbFoods];
            static_food_list.forEach(s => {
                const exists = dbFoods.some(d => (d.name && s.name && d.name.toLowerCase() === s.name.toLowerCase()) || (d.image && s.image && d.image === s.image));
                if (!exists) {
                    // ensure _id exists and doesn't collide
                    merged.push(s);
                }
            })

            // fetch vendor list to map vendorId -> vendor name for display
            // try to fetch vendor list from a set of common backend URLs
            // build two maps: id->name and ownerId->name so we can resolve vendorName
            // even when food.vendorId contains the vendor owner's id (older items)
            async function tryVendorList(backends) {
                for (const b of backends) {
                    try {
                        const vResp = await axios.get(b + '/api/vendor/list');
                        if (vResp && vResp.data && vResp.data.success && Array.isArray(vResp.data.data)) {
                            const idMap = {};
                            const ownerMap = {};
                            const detailsMap = {};
                            vResp.data.data.forEach(v => {
                                if (v && v._id) idMap[String(v._id)] = v.name;
                                if (v && v.ownerId) ownerMap[String(v.ownerId)] = v.name;
                                // index details by both vendor _id and ownerId so older items referencing ownerId are resolvable
                                if (v && v._id) detailsMap[String(v._id)] = v;
                                if (v && v.ownerId) detailsMap[String(v.ownerId)] = v;
                            });
                            // keep vendorMap as id->name for backwards compatibility
                            setVendorMap(idMap);
                            setVendorDetails(detailsMap);
                            if (b !== url) setUrl(b);
                            return { idMap, ownerMap, detailsMap };
                        }
                    } catch (e) {
                        // try next backend URL
                    }
                }
                setVendorMap({});
                setVendorDetails({});
                return { idMap: {}, ownerMap: {}, detailsMap: {} };
            }

            const vendorMapResult = await tryVendorList([url, 'http://localhost:4001', 'http://localhost:4000', 'http://localhost:4100']);
            const idMap = (vendorMapResult && vendorMapResult.idMap) || {};
            const ownerMap = (vendorMapResult && vendorMapResult.ownerMap) || {};
            const detailsMap = (vendorMapResult && vendorMapResult.detailsMap) || {};

            // enrich merged list with vendorName when vendorMap is available
            const enriched = merged.map(it => {
                const vid = it.vendorId ? String(it.vendorId) : null;
                const resolvedName = vid ? (idMap[vid] || ownerMap[vid]) : (it.vendorName || null);
                return { ...it, vendorName: resolvedName };
            });
            // if merged is empty and we have static food fall back
            if (enriched.length === 0 && static_food_list && static_food_list.length > 0) {
                setAllFoodList(static_food_list);
            } else {
                setAllFoodList(enriched);
            }
            // debug: log vendor count
            try { console.log('vendorMap size=', Object.keys(idMap || {}).length); } catch(e){}
        } catch (error) {
            console.error('Failed to fetch food list:', error);
            // fallback: use bundled static list so the UI still shows dishes
            setFoodList([]);
            setAllFoodList(static_food_list || []);
        }
    }

    const fetchMyVendor = async (tk) => {
        try {
            const theToken = tk || token || localStorage.getItem('token')
            if (!theToken) return setMyVendor(null)
            // fetch profile to ensure role is synced
            try {
                const profileResp = await axios.get(url + '/api/user/me', { headers: { Authorization: `Bearer ${theToken}` } });
                if (profileResp && profileResp.data && profileResp.data.success && profileResp.data.data) {
                    const serverRole = profileResp.data.data.role;
                    if (serverRole) {
                        setRole(serverRole);
                        try { if (window.localStorage && typeof window.localStorage.setItem === 'function') window.localStorage.setItem('role', serverRole) } catch (e) {}
                    }
                }
            } catch (e) {
                // ignore profile errors, continue to vendor fetch
            }

            const resp = await axios.get(url + '/api/vendor/me', { headers: { Authorization: `Bearer ${theToken}` } })
            if (resp.data && resp.data.success) setMyVendor(resp.data.data)
        } catch (error) {
            console.error('Failed to fetch my vendor:', error);
            setMyVendor(null)
        }
    }

    // helper: get vendor name by vendorId, fetch vendor list if necessary
    // get vendor name by vendorId; will fetch vendor list if necessary
    // the backend historically stored either the vendor document _id or the vendor owner's id
    // so we consult both id->name and ownerId->name mappings
    const getVendorName = async (vendorId) => {
        if (!vendorId) return null;
        // fast path: vendorMap may already contain id->name
        if (vendorMap && vendorMap[vendorId]) return vendorMap[vendorId];
        try {
            const vResp = await axios.get(url + '/api/vendor/list');
            if (vResp && vResp.data && vResp.data.success && Array.isArray(vResp.data.data)) {
                const idMap = {};
                const ownerMap = {};
                vResp.data.data.forEach(v => {
                    if (v && v._id) idMap[String(v._id)] = v.name;
                    if (v && v.ownerId) ownerMap[String(v.ownerId)] = v.name;
                });
                // cache idMap in vendorMap for future quick lookups
                setVendorMap(idMap);
                // prefer id map, then owner map
                return idMap[String(vendorId)] || ownerMap[String(vendorId)] || null;
            }
        } catch (e) {
            // ignore failures
        }
        return null;
    }

    // keep viewMode persisted
    useEffect(() => {
        try { if (window.localStorage && typeof window.localStorage.setItem === 'function') window.localStorage.setItem('viewMode', viewMode) } catch(e){}
    }, [viewMode])

    const rateFood = async (id, rating) => {
        try {
            const response = await axios.post(url + "/api/food/rate", { id, rating });
            // refresh list to get updated ratings
            await fetchFoodList();
            return response.data;
        } catch (error) {
            console.error('Failed to submit rating', error);
            throw error;
        }
    }

    const loadCartData = async (tk) => {
        // accept either a raw token string or an object like { token: '...' }
        let theToken = '';
        if (!tk) theToken = token;
        else if (typeof tk === 'string') theToken = tk;
        else if (tk && tk.token) theToken = tk.token;
        else if (tk && tk.Authorization) theToken = tk.Authorization;
        const headers = theToken ? { Authorization: `Bearer ${theToken}` } : {};
        try {
            const response = await axios.post(url + "/api/cart/get", {}, { headers });
            setCartItems(response.data.cartData || {});
        } catch (e) {
            console.warn('loadCartData failed', e);
            setCartItems({});
        }
    }

    useEffect(() => {
        async function loadData() {
            await fetchFoodList();
                    // If a token is stored and auto-restore is enabled, verify it with the backend before restoring session state.
                    const storedToken = localStorage.getItem('token');
                    // By default auto-restore is enabled. Set VITE_AUTO_RESTORE_TOKEN='false' to disable.
                    const allowAutoRestore = import.meta.env.VITE_AUTO_RESTORE_TOKEN === 'false' ? false : true
                    if (storedToken && allowAutoRestore) {
                        try {
                                const profileResp = await axios.get(url + '/api/user/me', { headers: { Authorization: `Bearer ${storedToken}` } });
                            if (profileResp && profileResp.data && profileResp.data.success && profileResp.data.data) {
                                const serverRole = profileResp.data.data.role;
                                if (serverRole) {
                                    setRole(serverRole);
                                    try { if (window.localStorage && typeof window.localStorage.setItem === 'function') window.localStorage.setItem('role', serverRole) } catch (e) {}
                                }
                                // only set token once verified
                                setToken(storedToken);
                                await loadCartData({ token: storedToken });
                                await fetchMyVendor(storedToken);
                            } else {
                                // server responded but indicates token invalid
                                try { localStorage.removeItem('token'); localStorage.removeItem('role'); } catch(e){}
                                setToken('');
                                setRole('user');
                                // notify user
                                try { flashAuth('error', 'Saved session is invalid. Please sign in.'); } catch(e){}
                                try { toast.error('Saved session invalid — please sign in'); } catch(e){}
                            }
                        } catch (e) {
                            // If server explicitly rejected the token (401/403), clear it.
                            const status = e && e.response && e.response.status
                            if (status === 401 || status === 403) {
                                console.warn('Stored token rejected by server, clearing local session', status)
                                try { localStorage.removeItem('token'); localStorage.removeItem('role'); } catch(e){}
                                setToken(''); setRole('user');
                                try { flashAuth('error', 'Saved session expired or invalid — signed out'); } catch(e){}
                                try { toast.error('Session expired — signed out'); } catch(e){}
                            } else {
                                // network error or transient issue: keep token for now and retry verification later
                                console.warn('Token verification failed due to network/transient error, will retry later', e)
                                setToken(storedToken)
                                // schedule a verification retry after a short delay
                                setTimeout(async () => {
                                    try {
                                        const resp = await axios.get(url + '/api/user/me', { headers: { Authorization: `Bearer ${storedToken}` } });
                                        if (resp && resp.data && resp.data.success && resp.data.data) {
                                            const serverRole = resp.data.data.role;
                                            if (serverRole) {
                                                setRole(serverRole);
                                                try { if (window.localStorage && typeof window.localStorage.setItem === 'function') window.localStorage.setItem('role', serverRole) } catch (e) {}
                                            }
                                            await loadCartData({ token: storedToken });
                                            await fetchMyVendor(storedToken);
                                            // notify user that session restored after a transient error
                                            try { flashAuth('success', 'Session restored'); } catch(e){}
                                            try { toast.success('Session restored'); } catch(e){}
                                        }
                                    } catch (err) {
                                        console.warn('Retry token verification failed', err)
                                    }
                                }, 5000)
                            }
                        }
            }
            // finished initial load
            setInitializing(false);
            // connect socket after initial load so backend URL is known
            try {
                const theToken = localStorage.getItem('token') || token || '';
                const s = io(url, { auth: { token: theToken } });
                s.on('connect', ()=>console.log('socket connected', s.id));
                s.on('order:update', (payload)=>{
                    console.debug('socket order:update', payload)
                    setLastOrderUpdate(payload)
                })
                s.on('disconnect', ()=>console.log('socket disconnected'))
                setSocket(s)
            } catch (e) { console.warn('socket connect failed', e) }
        }
        loadData()
    }, [])

    // when token changes (e.g., after login), refresh vendor info
    useEffect(() => {
        if (token) {
            fetchMyVendor(token).catch(e => console.debug('fetchMyVendor failed', e))
        } else {
            setMyVendor(null)
        }
    }, [token])

    const contextValue = {
        url,
        food_list,
        all_food_list,
        menu_list,
        vendorDetails,
        rateFood,
        cartItems,
        addToCart,
        removeFromCart,
        getTotalCartAmount,
        token,
        role,
        viewMode,
        setViewMode,
        setToken,
        setRole,
        loadCartData,
        setCartItems,
        myVendor,
    getVendorName,
        setMyVendor,
        fetchMyVendor,
        lastOrderUpdate,
    socket,
        currency,
        deliveryCharge
        ,initializing
        ,authFlash
        ,flashAuth
        ,authAnim
        ,triggerAuthAnim
    };

    return (
        <StoreContext.Provider value={contextValue}>
            {props.children}
        </StoreContext.Provider>
    )

}

export default StoreContextProvider;