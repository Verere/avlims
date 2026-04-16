"use client"


import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";


 

const AddGroupPage = ({locationss, addGroup, storeid }) => {
    
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [values, setValues] = useState("")

  async function findGroup(e){  
    setValues(e);
    const params = new URLSearchParams(searchParams);
 params.set("location", e);
 
 if(pathname){
 
   replace(`${pathname}?${params}`);
 }
 
  }
 
  return (
    <>

      <form action={addGroup} className="flex justify-between  w-full mt-0 mr-0 ml-0 ">
      

       
     
      <input type="text" placeholder="Enter New Group" name="name" className="border mx-2 border-gray-400 p-2 w-full" required />
     
      <select name="location" id="cat"  value={values} onChange={(e)=>findGroup(e.target.value)}>
          <option value="">Choose Location</option>
            {
              locationss.map(menu=>(
                <option key={menu._id} id={menu.name} value={menu.name} >{menu.name}</option>
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

export default AddGroupPage;

