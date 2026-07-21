'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  {
    question: 'Is this a real, working system?',
    answer:
      "Yes, this is a fully functional prototype connected to a real WhatsApp number via Twilio. It's a demo built for Lumin Aesthetic Clinic, showing the workflow end-to-end.",
  },
  {
    question: 'How does the AI know what to say?',
    answer:
      'The assistant only draws from the clinic’s own FAQ content. If a patient asks something outside that scope, it says “I don’t know” instead of guessing or inventing an answer.',
  },
  {
    question: 'What happens if the AI gets something wrong?',
    answer:
      'Nothing reaches the patient automatically. Every draft goes to an admin first, who can approve, edit, or reject it before anything is sent.',
  },
  {
    question: 'Can this handle appointment booking?',
    answer:
      'Yes. The demo can record appointment requests through an MCP booking tool, while the patient-facing confirmation still requires explicit admin review.',
  },
  {
    question: 'What would change for a real client engagement?',
    answer:
      'The FAQ content, tone, and edge cases would be tailored to the client, plus integrations like calendar sync, CRM sync, and multi-language support as needed.',
  },
] as const

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="border-t border-border">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index
        const answerId = `faq-answer-${index}`

        return (
          <div key={faq.question} className="border-b border-border">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={answerId}
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full cursor-pointer items-center justify-between gap-5 px-1 py-6 text-left"
            >
              <span className="font-display text-lg font-semibold">
                {faq.question}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  'size-5 shrink-0 transition-transform duration-300',
                  isOpen && 'rotate-180'
                )}
              />
            </button>
            <div
              id={answerId}
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-in-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="overflow-hidden">
                <p className="px-1 pb-6 text-[15px] leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
