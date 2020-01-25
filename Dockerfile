FROM node:10

ARG work_dir=/usr/src/bot

#create working directory
RUN mkdir -p $work_dir
WORKDIR $work_dir

# install dependencies
COPY package.json $work_dir
RUN npm install

# copy sources
COPY . $work_dir

#start bot
CMD ["node", "index.js"]

