"use client"

import React from 'react'
import { HoverBorderGradient } from './ui/hover-border-gradient'
import { motion } from 'framer-motion'
import { 
    IconUserCircle, 
    IconPencilPlus, 
    IconShoppingBag, 
    IconRobot, 
    IconShieldCheck, 
    IconStar, 
    IconMail, 
    IconBox,
    IconCircleDotted 
} from '@tabler/icons-react'

const features = [
    {
        title: "Business Profile Management",
        description: "Create and manage customized business profiles with ease.",
        icon: <IconUserCircle size={32} className="text-gray-500" />,
        className: "md:col-span-2 md:row-span-2"
    },
    {
        title: "Post Creation",
        description: "Share updates, promotions, and announcements to engage your audience.",
        icon: <IconPencilPlus size={32} className="text-gray-500" />,
        className: "md:col-span-1"
    },
    {
        title: "Free E-Commerce Websites",
        description: "Build free e-commerce sites with built-in SEO integration.",
        icon: <IconShoppingBag size={32} className="text-gray-500" />,
        className: "md:col-span-1"
    },
    {
        title: "AI-Powered Chatbots",
        description: "Provide 24/7 customer assistance with intelligent AI chatbots.",
        icon: <IconRobot size={32} className="text-gray-500" />,
        className: "md:col-span-1 md:row-span-2"
    },
    {
        title: "Business Verification",
        description: "Verify identity using official business documents for trust.",
        icon: <IconShieldCheck size={32} className="text-gray-500" />,
        className: "md:col-span-1"
    },
    {
        title: "Loyalty Program",
        description: "Create and manage customer loyalty programs effectively.",
        icon: <IconStar size={32} className="text-gray-500" />,
        className: "md:col-span-1"
    },
    {
        title: "Email Marketing",
        description: "Send promotional emails and newsletters to your customers.",
        icon: <IconMail size={32} className="text-gray-500" />,
        className: "md:col-span-1"
    }
]

const FeatureCard = ({ feature }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className={`${feature.className} group p-8 h-full bg-white/5 dark:bg-black/50 hover:bg-white/10 dark:hover:bg-black/60 rounded-3xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all relative overflow-hidden`}
        >
            <div className="absolute top-0 right-0 opacity-10">
                <IconCircleDotted size={120} className="text-purple-500 transform rotate-45" />
            </div>
            <div className="absolute bottom-0 left-0 opacity-10">
                <IconCircleDotted size={80} className="text-pink-500 transform -rotate-45" />
            </div>

            <div className="relative z-10 h-full flex flex-col justify-between">
                <div></div>
                
                <div className="flex items-end gap-4">
                    <div className="flex-shrink-0">
                        {feature.icon}
                    </div>
                    <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-black dark:text-white group-hover:text-purple-400 transition-colors">
                            {feature.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm h-0 group-hover:h-auto opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden group-hover:mt-2">
                            {feature.description}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

const Features = () => {
    return (
        <section className="py-20 px-4 bg-white dark:bg-black transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <div className="flex justify-center mb-4">
                        <HoverBorderGradient>
                             Features
                        </HoverBorderGradient>
                    </div>
                    <h2 className="text-5xl font-medium text-black dark:text-white mb-4">
                        Everything you need to grow your business
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Powerful tools to help you manage and grow <br/>your business efficiently
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[250px]">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} feature={feature} />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Features