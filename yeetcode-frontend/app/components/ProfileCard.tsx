import { User } from "lucide-react";
import Image from "next/image";

interface ProfileCardProps {
  isResponding: boolean;
}

const ProfileCard = ({ isResponding }: ProfileCardProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-card border-b border-border">
      <div className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center transition-all ${
        isResponding ? 'ring-8 ring-primary animate-pulse shadow-lg shadow-primary/50' : ''
      }`}>
        <Image 
          src="/interviewer.png" 
          alt="Interviewer"
          width={128}
          height={128}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">Interviewer</p>
        <p className="text-sm text-muted-foreground">{isResponding ? 'Speaking...' : 'Listening'}</p>
      </div>
    </div>
  );
};

export default ProfileCard;
