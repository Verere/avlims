"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

 
 const AddMenuPage = ({addMenu, fetchMenuCategory, fetchMenuGroup, locationss, storeid }) => {
    
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();

 const [values, setValues] = useState("")
 const [values1, setValues1] = useState("")
 const [values2, setValues2] = useState("")
 const [groups, setGroups] = useState([""])
 const [categories, setCategories] = useState([""])

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

 async function findCategory(e){  
  const location = searchParams.get('location')
  console.log(location)
   setValues1(e);
   const cat = await fetchMenuCategory(storeid, location)
setCategories(cat)
console.log(categories)
 }
      
  return (
    <>

      <form action={addMenu} className="flex flex-col justify-between  w-full mt-0 mr-0 ml-0 ">
    <div className="flex justify-between w-full">
      <input type="text" placeholder="Enter New Menu" name="menu" className="border mx-2 border-gray-400 p-2 w-full" required />
      <input type="text" placeholder="Enter Menu Price" name="price" className="border mx-2 border-gray-400 p-2 w-full" required />
      <input type="text" placeholder="Enter UoM" name="uom" className="border mx-2 border-gray-400 p-2 w-full" required />
      </div>
      <div className="flex justify-between w-full mt-2">
      <select name="location" id="cat"  value={values}  onChange={(e)=>findGroup(e.target.value)}>
          <option value="">Choose Location</option>
            {
              locationss?.map(location=>(
                <option key={location._id} id={location.name} value={location.name} >{location.name}</option>
              ))
            }
        </select>
        <select name="group" id="cate"  value={values1} onChange={(e)=>findCategory(e.target.value)}>
          <option value="">Select Group</option>
            {
              groups?.map(group=>(
                <option key={group._id} id={group.name} value={group.name} >{group.name}</option>
              ))
            }
        </select>
        <select name="category" id="cate"  value={values2} onChange={(e)=>setValues2(e.target.value)} >
          <option value="">Select Category</option>
            {
              categories?.map( category=>(
                <option key={category._id} id={category.name} value={category.name} >{category.name}</option>
              ))
            }
        </select>
      <input type="hidden"  name="hotelId" value={storeid} />
      <input type="hidden"  name="path" value={pathname} />
          
      <button  className="border border-gray-400 rounded-md bg-black text-white p-2 ">Add New Menu</button>
      </div>
    
      </form>
    </>
  );
};

export default AddMenuPage;

