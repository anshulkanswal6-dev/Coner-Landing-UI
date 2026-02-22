import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const CustomSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    label,
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt =>
        typeof opt === 'string' ? opt === value : opt.value === value
    );

    return (
        <div className="space-y-2 w-full" ref={containerRef}>
            {label && (
                <label className="text-sm font-semibold text-slate-700 ml-1">
                    {label} {required && "*"}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "select-premium flex items-center justify-between text-left",
                        isOpen && "ring-2 ring-primary/20 border-primary"
                    )}
                >
                    <span className={cn(
                        "block truncate",
                        !value ? "text-slate-400" : "text-slate-900 font-medium"
                    )}>
                        {selectedOption
                            ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label)
                            : placeholder}
                    </span>
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="text-slate-400" size={20} />
                    </motion.div>
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 5, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute z-50 w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/80 border border-slate-100 py-3 overflow-hidden"
                        >
                            <div className="max-h-60 overflow-auto scrollbar-hide px-2">
                                {options.map((option, index) => {
                                    const labelStr = typeof option === 'string' ? option : option.label;
                                    const valStr = typeof option === 'string' ? option : option.value;
                                    const isSelected = value === valStr;
                                    const Icon = typeof option === 'object' && option.icon ? option.icon : null;

                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                onChange(valStr);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 group",
                                                isSelected
                                                    ? "bg-primary/5 text-primary"
                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                                isSelected ? "bg-primary/10" : "bg-slate-50 group-hover:bg-white shadow-sm"
                                            )}>
                                                {Icon ? (
                                                    <Icon size={16} className={isSelected ? "text-primary" : "text-slate-500"} />
                                                ) : (
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        isSelected ? "bg-primary" : "bg-slate-300"
                                                    )} />
                                                )}
                                            </div>
                                            <span className="flex-1 font-medium text-sm">{labelStr}</span>
                                            {isSelected && <Check size={16} className="text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CustomSelect;
