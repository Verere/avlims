"use client"

import { TbArrowBackUpDouble } from "react-icons/tb";
import { useRouter } from "next/navigation";



const StoreNavBurger = ()=>{
   
const router = useRouter()
    return(
        <>
                <TbArrowBackUpDouble onClick={() => router.back()} />
</>
    )
}
export default StoreNavBurger;