"use client";

import React from 'react';
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "~/components/ui/dialog";
import { ArrowRight, X } from "lucide-react";

interface OnboardingTourProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
  // TODO: Add props for target element refs if needed for highlighting
}

// Define tour steps content
const tourStepsContent = [
  {
    title: "Welcome to the Canvas!",
    description: "This is your creative space. Let's quickly show you around with a sample project.",
    highlightTarget: null, // Example: 'source-node-id' or a ref
  },
  {
    title: "Step 1: The Source Node",
    description: "This is a Source Node. It's where your core idea or content begins. You can input a topic, paste text, or link to existing content.",
    highlightTarget: 'source-sample',
  },
  {
    title: "Step 2: AI Agents",
    description: "These are AI Agents. Drag them onto the canvas and connect them to a source or other agents to generate different types of content like titles or blog posts.",
    highlightTarget: ['agent-title-sample', 'agent-blog-sample'], // Can be an array for multiple highlights or a general area
  },
  {
    title: "Step 3: Generating Content",
    description: "Click the 'Generate' button on an agent to create content. You can then view, edit, or refine it using the chat.",
    highlightTarget: 'agent-blog-sample', // Focus on one for this step
  },
  {
    title: "You're All Set!",
    description: "That's a quick overview! Feel free to explore, drag new agents, and generate content. Click 'Finish' to complete onboarding and start your first real project.",
    highlightTarget: null,
  },
];

export function OnboardingTour({ step, onNext, onSkip }: OnboardingTourProps) {
  if (step === 0 || step > tourStepsContent.length) {
    return null; // Tour is inactive or finished
  }

  const currentStepContent = tourStepsContent[step - 1];

  // Basic highlight style - this would need to be more sophisticated
  // to "cut out" around a target element. For V1, it's a placeholder concept.
  // const highlightStyle = currentStepContent.highlightTarget
  //   ? {
  //       position: 'absolute',
  //       border: '3px dashed #FF00FF', // Magenta border for visibility
  //       borderRadius: '8px',
  //       boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', // Overlay effect
  //       zIndex: 10000,
  //       // TODO: Calculate top, left, width, height based on target element
  //     }
  //   : {};

  return (
    <>
      {/* Placeholder for highlight overlay - actual implementation is complex */}
      {/* {currentStepContent.highlightTarget && <div style={highlightStyle as React.CSSProperties}></div>} */}

      <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onSkip(); }}>
        <DialogContent
          className="sm:max-w-md onboarding-tour-dialog"
          onInteractOutside={(e) => e.preventDefault()} // Prevent closing by clicking outside
          hideCloseButton={true} // Hide default close button
        >
          <DialogHeader>
            <DialogTitle>{currentStepContent.title}</DialogTitle>
            <DialogDescription>
              {currentStepContent.description}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:justify-between mt-4">
            <Button variant="ghost" onClick={onSkip} className="gap-1">
              <X className="h-4 w-4" /> Skip Tour
            </Button>
            {step < tourStepsContent.length ? (
              <Button onClick={onNext} className="gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={onSkip}>Finish</Button> // onSkip also marks onboarding complete
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
