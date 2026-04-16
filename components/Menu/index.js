"use client"

import { useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";


 

const AddMenuPage = ({ addMenu, storeid }) => {
    const [show, setShow] =useState(false)
    
  const searchParams = useSearchParams();
  const pathname = usePathname();

  
      
  return (
    <>

      <form action={addMenu} className="flex  w-full mt-0 mr-0 ml-0 ">
      

       
      <input type="text" placeholder="Enter New Menu" name="name" className="border border-gray-400 p-2 w-full" required />
      <input type="hidden"  name="storeid" value={storeid} />
      <input type="hidden"  name="path" value={pathname} />
          

      <button  className="border border-gray-400 rounded-md bg-black text-white p-2 w-full">Add New Menu</button>
    
      </form>
    </>
  );
};

export default AddMenuPage;

