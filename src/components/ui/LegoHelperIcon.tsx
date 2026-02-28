import legoAvatarImg from '../../assets/lego-avatar.png';

export const LegoHelperIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <img
      src={legoAvatarImg}
      alt="Lego Helper"
      className="w-full h-full object-contain filter drop-shadow-sm rounded-full"
    />
  </div>
);
