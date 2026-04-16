"use client";


import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CatSearch = ({ categories }) => {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();
 
 
   const handleSearch = (name) => {
    const params = new URLSearchParams(searchParams);

    if (name) {
    params.set("cat", name);
    } else {
      params.delete("cat");
    }
    if(pathname){
      replace(`${pathname}?${params}`);
    }
  };


  return (
    <>
    <div className="flex bg-gray-900 w-full overflow-x-auto">
    {categories.map(category=>
    <div onClick={()=>handleSearch(category.name)} className="mx-2 cursor-pointer my-3 py-5 px-1 hover:scale-125 duration-200 min-w-[80px] min-h-[80px] border border-gray-200 text-white rounded-lg" key={category._id}>
        <div className="text-sm font-bold text-center capitalize">{category.name}</div>
    </div>
        )}
        </div>
</>
  );
};

export default CatSearch;
