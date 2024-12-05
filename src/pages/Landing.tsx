import * as React from "react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock8Icon, BarChart2Icon, TrophyIcon } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4">
      <section className="min-h-[80vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Welcome to Haven
        </h1>
        <p className="text-xl mb-8 max-w-2xl text-gray-600">
          Join virtual deep work sessions, boost your productivity, and connect with
          like-minded individuals in a serene, focused environment.
        </p>
        <div className="space-x-4">
          <Button
            size="lg"
            onClick={() => navigate("/auth?mode=signup")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          >
            Get Started
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/auth?mode=signin")}
          >
            Sign In
          </Button>
        </div>
      </section>

      <section className="py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <feature.icon className="w-12 h-12 mb-4 text-purple-600" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    title: "Deep Work Sessions",
    description: "Join focused work sessions with up to 5 participants",
    icon: Clock8Icon,
  },
  {
    title: "Progress Tracking",
    description: "Monitor your productivity with detailed analytics",
    icon: BarChart2Icon,
  },
  {
    title: "Reward System",
    description: "Earn badges and unlock themes as you achieve milestones",
    icon: TrophyIcon,
  },
]; 