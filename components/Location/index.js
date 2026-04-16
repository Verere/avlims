"use client"


import { usePathname,} from "next/navigation"; 

const AddLocationPage = ({addLocation, storeid }) => {
    
  const pathname = usePathname();
      
  return (
    <>

      <form action={addLocation} className="flex justify-between  w-full mt-0 mr-0 ml-0 ">
      

       
     
      <input type="text" placeholder="Enter New Location" name="name" className="border mx-2 border-gray-400 p-2 w-full" required />
     
      <input type="hidden"  name="hotelId" value={storeid} />
      <input type="hidden"  name="path" value={pathname} />
          

      <button  className="border border-gray-400 rounded-md bg-black text-white p-2 w-full">Add New Menu</button>
    
      </form>
    </>
  );
};

export default AddLocationPage;

