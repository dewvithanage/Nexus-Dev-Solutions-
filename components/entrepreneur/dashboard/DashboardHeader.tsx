type DashboardHeaderProps = {
  title?: string;
};

export default function DashboardHeader({
  title = "Entrepreneur Dashboard",
}: DashboardHeaderProps) {
  return (
    <header className="flex h-[46px] shrink-0 items-center border-b border-[#E2E8F0] bg-white px-5">
      <h1 className="text-[16px] font-bold text-[#172033]">
        {title}
      </h1>
    </header>
  );
}