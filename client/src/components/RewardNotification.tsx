import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Trophy, Star, Award, Gift } from "lucide-react";

interface CompletedChallenge {
  id: string;
  userId: string;
  challengeType: string;
  progress: number;
  target: number;
  completed: boolean;
  completedAt: string;
  definition: {
    type: string;
    name: string;
    description: string;
    target: number;
    points: number;
    badge?: string;
    icon: string;
  };
}

interface RewardNotificationProps {
  completedChallenges: CompletedChallenge[];
  onClose: () => void;
}

export function RewardNotification({ completedChallenges, onClose }: RewardNotificationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-advance to next challenge after 4 seconds
    if (currentIndex < completedChallenges.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      // Auto-close after showing all challenges
      const timer = setTimeout(() => {
        handleClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, completedChallenges.length]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const handleNext = () => {
    if (currentIndex < completedChallenges.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  if (completedChallenges.length === 0 || !isVisible) {
    return null;
  }

  const currentChallenge = completedChallenges[currentIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 border-0 text-white shadow-2xl">
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Celebration effects */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 100, opacity: [0, 1, 0] }}
                  transition={{ 
                    duration: 2,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>

            <CardContent className="relative p-8 text-center space-y-6">
              {/* Trophy icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <div className="mx-auto w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="h-8 w-8 text-yellow-800" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold mb-2">Challenge Complete!</h2>
                <div className="flex items-center justify-center gap-2 text-lg">
                  <span className="text-2xl">{currentChallenge.definition.icon}</span>
                  <span>{currentChallenge.definition.name}</span>
                </div>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-blue-100"
              >
                {currentChallenge.definition.description}
              </motion.p>

              {/* Rewards */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <div className="bg-white/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="h-5 w-5 text-yellow-300" />
                    <span className="font-semibold text-lg">+{currentChallenge.definition.points} Points</span>
                  </div>
                  
                  {currentChallenge.definition.badge && (
                    <div className="flex items-center justify-center gap-2">
                      <Award className="h-5 w-5 text-purple-300" />
                      <span className="font-medium">{currentChallenge.definition.badge}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Progress indicator */}
              {completedChallenges.length > 1 && (
                <div className="flex justify-center gap-2">
                  {completedChallenges.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex gap-3 justify-center"
              >
                {currentIndex < completedChallenges.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    Next Reward
                  </Button>
                ) : (
                  <Button
                    onClick={handleClose}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    Continue Exploring
                  </Button>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}