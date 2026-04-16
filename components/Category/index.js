"use client"


import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";


 

const AddCategoryPage = ({menus, addCategory, storeid }) => {
    
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [values, setValues] = useState("")
      
  return (
    <>

      <form action={addCategory} className="flex justify-between  w-full mt-0 mr-0 ml-0 ">
      

       
     
      <input type="text" placeholder="Enter New Menu" name="name" className="border mx-2 border-gray-400 p-2 w-full" required />
      <select name="menu" id="cat"  value={values} onChange={(e)=>setValues(e.target.value)} >
          <option value="">Choose a Menu</option>
            {
              menus.map(menu=>(
                <option key={menu._id} id={menu.name} value={menu.name} >{menu.name}</option>
              ))
            }
        </select>
      <input type="hidden"  name="storeid" value={storeid} />
      <input type="hidden"  name="path" value={pathname} />
          

      <button  className="border border-gray-400 rounded-md bg-black text-white p-2 w-full">Add New Menu</button>
    
      </form>
    </>
  );
};

export default AddCategoryPage;

