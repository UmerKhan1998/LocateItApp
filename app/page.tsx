import CrosswordPuzzle from '@/components/CrosswordPuzzle'
import LocateItComp from '@/components/LocateItComp'

const page = () => {
  const wordsInput = ["NASA", "ABLE", "ECHO", "HEAT", "APPLE", "RABBIT", "BIRD", "MINT", "TOPIC", "TREE"];

  return (
    <div>
      {/* <LocateItComp /> */}
      <CrosswordPuzzle />
    </div>
  )
}

export default page
