'use client'
import Link from 'next/link'
import Banner from './rice.jpg'
import { FaFacebook, FaInstagram, FaLinkedin,FaLocationArrow, FaMobileAlt } from 'react-icons/fa'


const BannerImg={
    backgroundImage:`url(${Banner})`,
    backgroundPosition: "bottom",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    height: '100%',
    width: "100%",

}
const FooterLinks =[
    {
        title: "home",
        link: "/"
    },
    {
        title: "contact",
        link: "/"
    },
    {
        title: "membership",
        link: "/"
    },
    {
        title: "blog",
        link: "/"
    },
]
const Footer = ()=>{
    return(
        <>
        <div style={BannerImg} className='bg-black text-white'>
            <div className='container'>
            <div className='grid md:grid-cols-3 pb-44 pt-3' >
                <div className='py-4 px-4'>
                    <h1 className='flex items-center font-bold text-justify sm:text-left'>
                        <picture><img src='/logo.png'alt='logo' className='max-w-[50px]'/></picture>
                        <span className='ml-2'>Averit</span>
                        <span>Qr</span>
                    </h1>
                    <p>lorem is a kind of treasure in our domain. if you wnat to get ir please contact us</p>
                </div>
                  {/* important links */}
                <div className='grid grid-cols-3 sm:grid-cols-2 col-span-2 md:pl-10'>
                    <div>
                        <div className='p-4'>
                            <h2 className='text-xl md:text-2xl font-bold text-justify mb-3'>Important links</h2>
                        <ul className='flex flex-col gap-3'>
                            {FooterLinks.map(item=>(
                                <li key={item.title} className='py-2 cursor-pointer hover:translate-x-1 duration-300'>{item.title}</li>
                            ))}
                        </ul>
                        </div>
                    </div>

                    {/* social links */}
                    <div>
                        <div className='flex items-center gap-3 mt-6'>
                            <Link href='#'> 
                            <FaInstagram className='text-3xl'/>
                            </Link>
                            <Link href='#'> 
                            <FaFacebook className='text-3xl'/>
                            </Link>
                            <Link href='#'> 
                            <FaLinkedin className='text-3xl'/>
                            </Link>
                        </div>
                        <div className='mt-6'>
                            <div className='flex items-center gap-3'>
                                <FaLocationArrow/>
                                <p>Computer Village, Ikeja</p>
                            </div>
                            <div className='flex items-center gap-3'>
                                <FaMobileAlt/>
                                <p>+2349076361669</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
        </>
    )
}
export default Footer;