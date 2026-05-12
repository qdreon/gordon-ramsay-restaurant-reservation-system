'use client'

export default function profilePage() {
    return (
        <div className="p-6 bg-white flex flex-col gap-6">
            <div className="flex items-start gap-6 p-8 border border-black rounded-[40px] w-full max-w-2xl shadow-sm">
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                    <img className="w-full h-full object-cover" src="/avatar.png" alt="" />
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-2">
                        <h1 className="text-6xl font-medium">Guest Name</h1>
                    </div>

                    <div className="text-lg space-y-1">
                        <table className="w=full text-left border-seperate border-spacing-y-2">
                            <tbody>
                                <tr>
                                    <th className="w-24 font-bold">Email:</th>
                                    <td>Email</td>
                                </tr>
                                <tr>
                                    <th className="w-24 font-bold">Number:</th>
                                    <td>Number</td>
                                </tr>
                                <tr>
                                    <th className="w-24 font-bold">Birthday:</th>
                                    <td>Birthday</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <button onClick={()=>{console.log("Customer Data Edit Not Yet Implemented")}} className="block w-15 text-left px-4 py-2 rounded-[40px] hover:bg-gray-100 border border-black">Edit</button>
                </div>
            </div>
            
            <div className="border border-black rounded-[40px] w-full max-w-2xl shadow-sm">
                <div className="flex justify-between items-baseline mb-2 mt-2">
                    <h1 className="ml-4 mt-1 mb-1 text-4xl font-medium">CRM</h1>
                    <button onClick={()=>{console.log("CRM Edit Not Yet Implemented")}} className="block w-15 text-left px-4 py-2 rounded-[40px] hover:bg-gray-100 ">Edit</button>
                </div>

                <ul id="CRM_LIST">
                </ul>
            </div>

            <button onClick={()=>{console.log("Delete Not Yet Implemented")}} className="text-red-500 border border-red-500 bg-transparent hover:bg-red-50 p-2 rounded-md">Delete Button (QDR-61)</button>
        </div>
    )
}