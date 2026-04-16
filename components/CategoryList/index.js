"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Box, Flex, Text } from "@radix-ui/themes"

const CatLists = ({categories}) =>{
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const pathname = usePathname();

    const handleSearch = (category) => {
        const params = new URLSearchParams(searchParams);
       const cat= params.get("category");
       console.log("pcat",cat)
        console.log(category)
        params.delete("category");
        params.set("category", category); 
      
        if(pathname){
    
          replace(`${pathname}?${params}`);
        }
      }

    return(
        <Flex direction="row" >
        {categories.map(cat=>(
<>
<div  className='text-center cursor-pointer rounded-lg border shadow-lg w-full -z-9' key={cat._id}>

<Box onClick={()=>handleSearch(cat.name)}  width="auto" height="64px" p="2" px="4" minWidth="64px">
<Text as="div" align="center">
{ cat.name}
</Text>
</Box>
</div>
</>
        ))}


</Flex>
    )
} 
export default CatLists