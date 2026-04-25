import ChatUI from "./ChatUI";
import ClozeText from "./ClozeText";
import EmailWrapper from "./EmailWrapper";
import NoticeSign from "./NoticeSign";

const CLOZE_OPTIONS = [
  { letter: "A", displayLetter: "A", text: "on" },
  { letter: "B", displayLetter: "B", text: "in" },
  { letter: "C", displayLetter: "C", text: "at" },
  { letter: "D", displayLetter: "D", text: "by" },
];

export default function EnglishComponentsPreview() {
  return (
    <main className="min-h-screen bg-surface px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">Sprint 3</p>
          <h1 className="mt-1 text-3xl font-black text-on-surface">English render components</h1>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <NoticeSign data={{ type: "warning", text: "Wet Floor", location: "public building" }} />
          <NoticeSign data={{ type: "prohibition", text: "No Smoking", location: "hospital" }} />
        </section>

        <ChatUI
          data={{
            speaker_a_name: "Maya",
            speaker_a_message: "I'm sorry I forgot your book at home.",
          }}
        />

        <EmailWrapper
          data={{
            from: "library@school.edu",
            to: "grade11@student.edu",
            date: "April 25",
            subject: "Book return reminder",
            body: "Dear student,\n\nPlease return the English reader before Friday at 3 p.m.\n\nThank you,\nSchool Library",
          }}
        />

        <ClozeText
          text="Students should arrive [BLANK] Monday morning because the exam starts early."
          options={CLOZE_OPTIONS}
          selectedLetter={null}
          onSelect={() => undefined}
        />
      </div>
    </main>
  );
}

