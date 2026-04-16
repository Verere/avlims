'use client'
import {  useState } from "react";
import Products from '@/components/Products'
import CommonModal from '@/components/CommonModal';
import { usePathname } from "next/navigation";



const AddProd = ({AddProduct, categories, menus, storeid}) =>{
    const [showNavModal, setShowNavModal] = useState(false);
    const pathname = usePathname();

    const[values, setValues] = useState("")
    const[values2, setValues2] = useState("")
  const isModalView = false
    return(
        <>
        <button   onClick={() => setShowNavModal(!showNavModal)}>Add New Product</button>
         <CommonModal
        showModalTitle={false}
        mainContent={<Products isModalView={true} storeid={storeid}  categories={categories} menus={menus} AddProduct={AddProduct}  values={values} setValues={setValues}  values2={values2} setValues2={setValues2}   pathname={pathname}/>}
        show={showNavModal}
        setShow={setShowNavModal}    
        
      />
        </>
    )

}
export default AddProd