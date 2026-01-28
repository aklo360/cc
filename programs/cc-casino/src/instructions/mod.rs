//! Instruction handlers for CC Casino

pub mod initialize;
pub mod fund;
pub mod withdraw;
pub mod coinflip;
pub mod crash;
pub mod jackpot;
pub mod gacha;

pub use initialize::*;
pub use fund::*;
pub use withdraw::*;
pub use coinflip::*;
pub use crash::*;
pub use jackpot::*;
pub use gacha::*;
