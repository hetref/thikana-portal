import TopNavbar from "@/components/TopNavbar";

const LandingPageLayout = ({ children }) => {
  return (
    <div>
      <TopNavbar />
      {children}
    </div>
  );
};

export default LandingPageLayout;
