import React from 'react';
import Link from 'next/link'

const StoreLists = async ({stores}) => {

    return (

        <div className="min-h-screen  z-[-10]">
            {
                    stores ?
                    stores.map(store =>(
                        <article className="relative flex flex-col overflow-hidden border border-gray-500 rounded mb-4 cursor-pointer" key={store?._id}>
                        <Link href={`hotels/${store?._id}`} passHref>
                               <h1>{store?.name} </h1> 
                        </Link>
                               <hr /> 
                        </article>
                    ))                  
                    
                    :'no store'
                    }
            
      
        </div>
    );
}

export default StoreLists;
