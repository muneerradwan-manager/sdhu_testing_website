/** Placeholder shown during prerender and hydration, sized like the live dashboard to avoid layout shift */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="جارٍ حساب المواقيت">
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="skeleton h-[34rem] rounded-3xl lg:h-[28rem]" />
        <div className="skeleton h-[32rem] rounded-3xl lg:h-[28rem]" />
      </div>
      <div className="skeleton mt-10 h-8 w-64 rounded-xl" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-36 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
