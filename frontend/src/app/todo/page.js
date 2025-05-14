import PageLayout from "@/components/PageLayout"

export default function TodoPage() {
  return (
    <PageLayout title="TO-DO LIST">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
        Main Content Area
      </h1>
      <p className="mt-2 text-slate-700 dark:text-slate-300">
        Your page content goes here. The sidebar will be fixed on the left on larger screens,
        and toggleable on mobile screens.
      </p>
      {/* Add more content to test scrolling within main area */}
      <div className="mt-10 h-auto bg-white dark:bg-slate-800 rounded-lg p-4">
        Scrollable Content
      </div>
    </PageLayout>
  )
}