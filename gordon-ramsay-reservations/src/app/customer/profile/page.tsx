export default function profilePage() {
    return (
        <div className="p-6 bg-white flex flex-col gap-6">
            <div className="flex items-start gap-6 p-8 border border-black rounded-[40px] w-full max-w-2xl shadow-sm">
                <div className="w-35 h-35 rounded-full overflow-hidden border-2 border-gray-200">
                    <img src="/avater.png" alt="" />
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

                    <button className="block w-15 text-left px-4 py-2 rounded-[40px] hover:bg-gray-100">Edit</button>
                </div>
            </div>
            
            <div className="border border-black rounded-[40px] w-full max-w-2xl shadow-sm">
                <div className="flex justify-between items-baseline mb-2">
                    <h1 className="text-4xl font-medium">CRM</h1>
                    <button className="block w-15 text-left px-4 py-2 rounded-[40px] hover:bg-gray-100">Edit</button>
                </div>

                <ul>
                    <li></li>
                    <li></li>
                    <li></li>
                </ul>
            </div>
        </div>
    )
}