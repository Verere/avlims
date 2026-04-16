'use client'
import {addProduct}  from "@/actions";


const AddProductPage = ({categories, menus, storeid, pathname, values, setValues, values2, setValues2}) => {
    console.log(menus)

  return (
    
      <form action={addProduct} className="flex flex-col w-full mt-0 mr-0 ml-0 space-y-8 z-[-9]">
      <h3 className="text-center font-bold uppercase pt-4"> Enter New Product</h3>
      
      <div className="w-full mt-0 mr-0 ml-0 space-y-8">

       
        <input type="text" placeholder="Enter Product Name" name="name" className="border border-gray-400 p-2 w-full" required />
        <input type="number" placeholder="price" name="price" required className="border border-gray-400 p-2" />
       
        <textarea
          className="border border-gray-400 p-2 w-full"
          required
          name="description"
          id="desc"
          rows="6"
          placeholder="Enter Product Description"

          ></textarea>

       <div  className="flex flex-col gap-5 md:flex  justify-between w-full">

        <select name="menu" id="menu"  value={values} onChange={(e)=>setValues(e.target.value)} >
          <option value="">Choose a Menu</option>
            {
              menus.map(menu=>(
                <option key={menu._id} id={menu.name} value={menu.name} >{menu.name}</option>
              ))
            }
        </select>

       <select name="category" id="cat"  value={values2} onChange={(e)=>setValues2(e.target.value)} >
          <option value="">Choose a Category</option>
            {
              categories.map(cat=>(
                <option key={cat._id} id={cat.name} value={cat.name} >{cat.name}</option>
              ))
            }
        </select>
       
        
       </div>

       
        <input type="text" placeholder="Enter Image Url" name="image" className="border border-gray-400 p-2 w-full"/>
        <input type="hidden"  name="storeid" value={storeid}/>
        <input type="hidden"  name="path" value={pathname}/>
        
        
        <button className="border border-gray-400 rounded-md bg-black text-white p-2 w-full" type="submit">Submit</button>
      
     </div>
      </form>
  );
};

export default AddProductPage;

