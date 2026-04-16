"use client";
import {useState} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Badge, DataList, TextField } from "@radix-ui/themes";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { fetchMenuSearch } from "@/actions";

const MenuSearch = ({ storeId }) => {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();
  const [display, setDisplay]= useState(false)
  const [menus, setMenus] = useState([])
  const [location, setLocation]= useState("")
 
   function handleItems(item){
    const params = new URLSearchParams(searchParams);
    params.set("item", item._id);
    if(pathname){
        replace(`${pathname}?${params}`);

    }
setDisplay(!display)
 }
    
   const handleSearch = useDebouncedCallback(async(e) => {
    const params = new URLSearchParams(searchParams);
const location = params.get("location");

    if (e.length > 0) {
       const menu = await fetchMenuSearch(storeId, location, e)
       setMenus(menu)
      setDisplay(false)
    } else {
        setDisplay(true)
    }
   
  }, 300);


  return (

        <div className="container pb-2 mx-auto">
        <TextField.Root onChange={(e)=>handleSearch(e.target.value)} placeholder="Search Menu to add Stock">
  <TextField.Slot>
    <FaMagnifyingGlass height="16" width="16" />
  </TextField.Slot>
</TextField.Root>
<div className={` ${display && 'hidden'} `}>
    {menus && menus.map(item =>(
        <>
        <div onClick={()=>handleItems(item)} className='w-full cursor-pointer' key={item._id}>
    <p className="p-1 ">{item.menu}</p>  
</div>
        </>
    ))}

</div>

</div>
    
  );
};

export default MenuSearch;
