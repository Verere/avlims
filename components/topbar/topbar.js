"use client";
import { usePathname } from "next/navigation";
import styles from "./navbar.module.css";
import { Menu, Transition, Popover } from "@headlessui/react";
import { FaBarsStaggered, FaPencil } from "react-icons/fa6";
import { FaCheckSquare } from "react-icons/fa";
import { Fragment } from "react";
import {
  MdNotifications,
  MdOutlineChat,
  MdPublic,
  MdSearch,
} from "react-icons/md";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TopBar = ({showNav, setShowNav, slug}) => {
 const { replace } = useRouter();
  return (
    <div className={`fixed w-full mb-8 h-16 bg-black flex justify-between items-center transition-all duration-[400ms] ${showNav ? "pl-56" : ""}`}>
      <div className="pl-4 md:pl-16">
        <FaBarsStaggered className="w-8 h-8 text-gray-100 cursor-pointer" onClick={()=> setShowNav(!showNav)}/>
        </div>
      <ul className='flex w-1/2 justify-between items-center text-white font-bold px-2'>
        <li  className ='cursor-pointer' onClick ={()=>replace(`/dashboard/${slug}/reg`)}>Home</li>
        <li  className ='cursor-pointer' onClick ={()=>replace(`/dashboard/${slug}/orders`)}>Orders</li>
        <li  className ='cursor-pointer' onClick ={()=>replace(`/dashboard/${slug}/payments`)}>Payments</li>
        <li  className ='cursor-pointer' onClick ={()=>replace(`/dashboard/${slug}/expenses`)}>Expenses</li>
        <li  className ='cursor-pointer' onClick ={()=>replace(`/dashboard/${slug}/outstanding`)}>Outstanding</li>
        {/* <li  className ='cursor-pointer' onClick ={()=>replace(`/dashboard/${slug}/eod`)}>EOD</li> */}
        <li  className ='cursor-pointer' onClick ={()=>replace(`/dashboard/${slug}/ref`)}>Referrals</li>
        <li  className ='cursor-pointer mr-2' onClick ={()=>replace(`/login`)}>Logout</li>

      </ul>
         
      </div>
  );
};

export default TopBar;
