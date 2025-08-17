
import { CornerUpLeft } from "lucide-react";
type Props = {
    showSignup?: boolean;
    setShowSignup?: (show: boolean) => void;
}
export default function SignupPage(props: Props) {
    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
            e.preventDefault();
            if (props.setShowSignup) {
                props.setShowSignup(false);
            }
            return
        }
    return (
        <>
        <div className="fixed top-6 left-4 hover:cursor-pointer hover:scale-120 ease-in-out duration-150" onClick={handleClick}><CornerUpLeft/></div>
        <div className="flex items-center justify-center h-screen bg-transparent">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-lg shadow-lg w-full max-w-md">
                <h1 className="text-2xl font-bold text-center text-white mb-6">Sign Up</h1>
                <form>
                    <div className="mb-4">
                        <label className="block text-white mb-2" htmlFor="email">Email</label>
                        <input type="email" placeholder="Enter Your Email" id="email" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-white mb-2" htmlFor="username">Username</label>
                        <input type="text" id="username" placeholder="Enter Your Username" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div className="mb-6">
                        <label className="block text-white mb-2" htmlFor="password">Password</label>
                        <input type="password" id="password" placeholder="Enter Your Password" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">Sign Up</button>
                </form>
            </div>
        </div> 
        </>
    );
}