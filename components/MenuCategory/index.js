"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

 
 const AddMenuCategoryPage = ({addMenuCategory,  fetchMenuGroup, locationss, storeid }) => {
    
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();

 const [values, setValues] = useState("")
 const [values1, setValues1] = useState("")
 const [groups, setGroups] = useState([""])

 async function findGroup(e){  
   setValues(e);
   const params = new URLSearchParams(searchParams);
params.set("location", e);
   const group = await fetchMenuGroup(storeid, e)
setGroups(group)

if(pathname){

  replace(`${pathname}?${params}`);
}

 }
      
  return (
    <>

      <form action={addMenuCategory} className="flex justify-between  w-full mt-0 mr-0 ml-0 ">
    
      <input type="text" placeholder="Enter New Category" name="name" className="border mx-2 border-gray-400 p-2 w-full" required />
     
      <select name="location" id="cat"  value={values}  onChange={(e)=>findGroup(e.target.value)}>
          <option value="">Choose Location</option>
            {
              locationss?.map(location=>(
                <option key={location._id} id={location.name} value={location.name} >{location.name}</option>
              ))
            }
        </select>
        <select name="group" id="cate"  value={values1} onChange={(e)=>setValues1(e.target.value)} >
          <option value="">Select Group</option>
            {
              groups?.map(group=>(
                <option key={group._id} id={group.name} value={group.name} >{group.name}</option>
              ))
            }
        </select>
      <input type="hidden"  name="hotelId" value={storeid} />
      <input type="hidden"  name="path" value={pathname} />
          

      <button  className="border border-gray-400 rounded-md bg-black text-white p-2 w-full">Add New Menu</button>
    
      </form>
    </>
  );
};

export default AddMenuCategoryPage;

