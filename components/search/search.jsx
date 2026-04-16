"use client";

import { MdSearch } from "react-icons/md";
import styles from "./search.module.css";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

const Search = ({ placeholder, p }) => {
  console.log(p)
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();
 
 
   const handleSearch = useDebouncedCallback((e) => {
    const params = new URLSearchParams(searchParams);


    if (e.target.value) {      
      if(p="patient"){e.target.value.length > 2 && params.set("patient", e.target.value)}
      if(p="ref"){e.target.value.length > 2 && params.set("ref", e.target.value)}
      if(p="test"){e.target.value.length > 2 && params.set("test", e.target.value)}
      if(p="clinic"){e.target.value.length > 2 && params.set("clinic", e.target.value)}
    } else {
      
      if(p="patient"){ params.delete("patient")}
      else if(p="ref"){ params.delete("ref")}
      else if(p="test"){ params.delete("test")}
      else if(p="clinic"){ params.delete("clinic")}
     
    }
    if(pathname){

      replace(`${pathname}?${params}`);
    }else{
      replace(`/?${params}`);
    }
  }, 300);


  return (
    <div className={styles.container}>
      <MdSearch />
      <input
        type="text"
        placeholder={placeholder}
        className={styles.input}
        onChange={handleSearch}
      />
    </div>
  );
};

export default Search;
