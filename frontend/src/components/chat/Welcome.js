import { WelcomeSVG } from "../../utils/WelcomeSVG";

export default function Welcome() {
  return (
    <div className="lg:col-span-2 lg:block bg-white dark:bg-gray-900">
      <div className="pl-5">
        <WelcomeSVG />
        <div className="text-center">
          <h2 className="text-xl text-gray-500 dark:text-gray-400">
            Click the 'Match' or 'Start' button to the top left to begin. 
          </h2>
        </div>
      </div>
    </div>
  );
}
